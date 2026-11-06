echo "---------------------------------------------------"
echo "[STARTING]  GROOVE CONTROL INSTALL SCRIPT:         "
echo "            Please wait for each step to complete. "
echo "---------------------------------------------------"
echo "(1/9) Updating Repositories..."
sudo apt-get update
echo "(2/9) Upgrading RaspiOS..."
sudo apt-get upgrade -y
echo "(3/9) Installing GIT..."
sudo apt-get install -y git
echo "(4/9) Installing NVM and NodeJS..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 24
echo "(5/9) Updating npm..."
nvm install-latest-npm
echo "(6/9) Downloading Groove Control source code..."
cd ~; git clone https://github.com/ivomirb/GrooveControl.git
cd ~/GrooveControl
echo "(7/9) Installing Groove Control dependencies..."
npm install
echo "(8/9) Recompiling Groove Control dependencies..."
npm rebuild
echo "(9/9) Creating Menu and Desktop Shortcuts..."
sed "s|HOMEDIR|$HOME|g" ~/GrooveControl/build/rpi/pi-menu.desktop > ~/GrooveControl/temp.desktop
sudo mv ~/GrooveControl/temp.desktop /usr/share/applications/GrooveControl.desktop
sudo chmod +x /usr/share/applications/GrooveControl.desktop
sed "s|HOMEDIR|$HOME|g" ~/GrooveControl/build/rpi/pi-desktop.desktop > ~/GrooveControl/temp.desktop
mv ~/GrooveControl/temp.desktop ~/Desktop/GrooveControl.desktop
echo "---------------------------------------------------"
echo "[COMPLETE] Install Complete!  Thank you!"
echo "---------------------------------------------------"
