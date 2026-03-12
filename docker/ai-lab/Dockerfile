# AI Lab - Python/ML/Data Science Environment (Optimized)
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and desktop environment
RUN apt-get update && apt-get install -y \
    xfce4 xfce4-goodies \
    tightvncserver \
    x11vnc xvfb \
    wget curl git vim nano unzip zip \
    python3 python3-pip python3-dev python3-venv \
    software-properties-common \
    build-essential \
    fonts-liberation \
    firefox \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set up Python environment
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel

# Install Data Science and generic tools
RUN pip3 install --no-cache-dir \
    scikit-learn \
    jupyter \
    jupyterlab \
    pandas \
    numpy \
    matplotlib \
    seaborn \
    scipy

# Install NLP and CV tools
RUN pip3 install --no-cache-dir \
    nltk \
    spacy \
    opencv-python-headless

# Install Deep Learning frameworks (CPU only versions for size/compatibility)
# PyTorch
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# TensorFlow
RUN pip3 install --no-cache-dir tensorflow-cpu keras

# Install additional tools
RUN pip3 install --no-cache-dir \
    h2o \
    transformers

# Create lab user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:labpassword" | chpasswd

# Set up VNC directory
RUN mkdir -p /home/labuser/.vnc
RUN echo "labpassword" | vncpasswd -f > /home/labuser/.vnc/passwd
RUN chmod 600 /home/labuser/.vnc/passwd

# Create xstartup
RUN echo '#!/bin/bash\n\
xrdb $HOME/.Xresources\n\
startxfce4 &' > /home/labuser/.vnc/xstartup && \
    chmod +x /home/labuser/.vnc/xstartup

# Create startup script
RUN echo '#!/bin/bash\n\
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1\n\
vncserver :1 -geometry 1280x720 -depth 24\n\
tail -f /home/labuser/.vnc/*.log || tail -f /dev/null' > /home/labuser/startup.sh && \
    chmod +x /home/labuser/startup.sh

RUN chown -R labuser:labuser /home/labuser

USER labuser
WORKDIR /home/labuser

# Expose VNC port
EXPOSE 5901

CMD ["/home/labuser/startup.sh"]
